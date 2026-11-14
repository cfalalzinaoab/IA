#!/usr/bin/env python3
"""
PPTX_A_CLASE.PY · de un PowerPoint a un borrador de clase

    python3 herramientas/pptx_a_clase.py  mi-presentacion.pptx  03
    python3 herramientas/pptx_a_clase.py  mi-presentacion.pptx  03  --fecha 2026-12-02 --duracion "50 min"

Lee el .pptx y escribe  clases/clase-03.js  (y las imágenes que lleve, en
img/clase-03/). Lo que sale es un BORRADOR: el texto, las notas del orador,
las tablas y las imágenes pasan tal cual, repartidos en los tipos de
diapositiva que el pase sabe pintar. Los colores, las fuentes y la maqueta
del PowerPoint no pasan, a propósito: la clase se viste con el diseño de la
nave. Después se abre el .js y se retoca a mano lo que haga falta (una
pregunta, una cita, una cifra grande, un aparato del laboratorio…).

Cómo decide el tipo de cada diapositiva:
    la primera .......................... portada
    lleva una tabla ..................... tabla
    lleva una imagen .................... imagen  (con su texto al lado, si lo hay)
    solo tiene título ................... seccion
    título y texto ...................... puntos  (los niveles hundidos pasan a «sub»)
    texto sin título .................... texto

No necesita instalar nada: un .pptx es un zip con XML dentro y aquí se lee
con lo que trae Python.
"""
import argparse
import json
import posixpath
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'rel': 'http://schemas.openxmlformats.org/package/2006/relationships',
}
R_ID = '{%s}id' % NS['r']
R_EMBED = '{%s}embed' % NS['r']

# Lo que un navegador sabe pintar. Los .emf y .wmf de Office no entran.
IMAGENES = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'}

RAIZ = Path(__file__).resolve().parent.parent


def relaciones(zf, ruta):
    """Las relaciones de una parte del zip: {rId: (tipo, destino absoluto)}."""
    carpeta, nombre = posixpath.split(ruta)
    ruta_rels = posixpath.join(carpeta, '_rels', nombre + '.rels')
    if ruta_rels not in zf.namelist():
        return {}
    salida = {}
    for rel in ET.fromstring(zf.read(ruta_rels)).findall('rel:Relationship', NS):
        if rel.get('TargetMode') == 'External':
            continue
        destino = posixpath.normpath(posixpath.join(carpeta, rel.get('Target')))
        salida[rel.get('Id')] = (rel.get('Type').rsplit('/', 1)[-1], destino.lstrip('/'))
    return salida


def parrafos(cuerpo):
    """Los párrafos de un cuadro de texto: [(nivel, texto)], sin los vacíos."""
    salida = []
    if cuerpo is None:
        return salida
    for p in cuerpo.findall('a:p', NS):
        propiedades = p.find('a:pPr', NS)
        nivel = int(propiedades.get('lvl', '0')) if propiedades is not None else 0
        trozos = []
        for nodo in p:
            etiqueta = nodo.tag.rsplit('}', 1)[-1]
            if etiqueta in ('r', 'fld'):
                t = nodo.find('a:t', NS)
                if t is not None and t.text:
                    trozos.append(t.text)
            elif etiqueta == 'br':
                trozos.append(' ')
        texto = re.sub(r'\s+', ' ', ''.join(trozos)).strip()
        if texto:
            salida.append((nivel, texto))
    return salida


def leer_diapositiva(zf, ruta):
    """Saca de una diapositiva su título, subtítulo, texto, tablas, imágenes y notas."""
    raiz = ET.fromstring(zf.read(ruta))
    rels = relaciones(zf, ruta)
    d = {'titulo': '', 'subtitulo': '', 'cuerpo': [], 'tablas': [], 'imagenes': [], 'notas': []}

    for forma in raiz.iter('{%s}sp' % NS['p']):
        marcador = forma.find('p:nvSpPr/p:nvPr/p:ph', NS)
        tipo = marcador.get('type', 'body') if marcador is not None else None
        texto = parrafos(forma.find('p:txBody', NS))
        if not texto:
            continue
        if tipo in ('title', 'ctrTitle'):
            d['titulo'] = ' '.join(t for _, t in texto)
        elif tipo == 'subTitle':
            d['subtitulo'] = ' '.join(t for _, t in texto)
        elif tipo in ('dt', 'ftr', 'sldNum', 'hdr'):
            continue                      # fecha, pie y número de página: fuera
        else:
            d['cuerpo'].extend(texto)

    for tabla in raiz.iter('{%s}tbl' % NS['a']):
        filas = []
        for fila in tabla.findall('a:tr', NS):
            filas.append([' '.join(t for _, t in parrafos(celda.find('a:txBody', NS)))
                          for celda in fila.findall('a:tc', NS)])
        if filas:
            d['tablas'].append(filas)

    for imagen in raiz.iter('{%s}pic' % NS['p']):
        blip = imagen.find('p:blipFill/a:blip', NS)
        if blip is None or blip.get(R_EMBED) not in rels:
            continue
        propiedades = imagen.find('p:nvPicPr/p:cNvPr', NS)
        alt = (propiedades.get('descr') or '') if propiedades is not None else ''
        d['imagenes'].append({'ruta': rels[blip.get(R_EMBED)][1], 'alt': alt.strip()})

    for tipo, destino in rels.values():
        if tipo != 'notesSlide' or destino not in zf.namelist():
            continue
        for forma in ET.fromstring(zf.read(destino)).iter('{%s}sp' % NS['p']):
            marcador = forma.find('p:nvSpPr/p:nvPr/p:ph', NS)
            if marcador is not None and marcador.get('type') == 'body':
                d['notas'].extend(t for _, t in parrafos(forma.find('p:txBody', NS)))
    return d


def a_puntos(cuerpo):
    """[(nivel, texto)] → la lista de «puntos» de una clase, con sus «sub»."""
    puntos = []
    for nivel, texto in cuerpo:
        if nivel > 0 and puntos:
            if isinstance(puntos[-1], str):
                puntos[-1] = {'t': puntos[-1], 'sub': []}
            puntos[-1]['sub'].append(texto)
        else:
            puntos.append(texto)
    return puntos


def convertir(d, indice, guardar_imagen):
    """Una diapositiva leída → un diccionario con el formato de las clases."""
    notas = d['notas']
    salida = {}

    if indice == 0:
        salida = {'tipo': 'portada', 'titulo': d['titulo'] or 'Sin título'}
        subtitulo = d['subtitulo'] or ' '.join(t for _, t in d['cuerpo'])
        if subtitulo:
            salida['subtitulo'] = subtitulo
    elif d['tablas']:
        filas = d['tablas'][0]
        salida = {'tipo': 'tabla', 'titulo': d['titulo'], 'cabecera': filas[0], 'filas': filas[1:]}
    elif d['imagenes']:
        imagen = d['imagenes'][0]
        ruta = guardar_imagen(imagen['ruta'])
        if ruta:
            salida = {'tipo': 'imagen', 'titulo': d['titulo'], 'src': ruta,
                      'alt': imagen['alt'] or d['titulo']}
            if d['cuerpo']:
                salida['puntos'] = a_puntos(d['cuerpo'])
            for sobrante in d['imagenes'][1:]:      # las demás se guardan, por si se quieren usar
                guardar_imagen(sobrante['ruta'])
    if not salida:
        if d['titulo'] and not d['cuerpo']:
            salida = {'tipo': 'seccion', 'titulo': d['titulo']}
            if d['subtitulo']:
                salida['texto'] = d['subtitulo']
        elif d['titulo']:
            salida = {'tipo': 'puntos', 'titulo': d['titulo'], 'puntos': a_puntos(d['cuerpo'])}
        else:
            salida = {'tipo': 'texto', 'parrafos': [t for _, t in d['cuerpo']] or ['(diapositiva sin texto)']}

    if not salida.get('titulo', True):
        del salida['titulo']
    if notas:
        salida['notas'] = notas if len(notas) > 1 else notas[0]
    return salida


def main():
    lector = argparse.ArgumentParser(description='Convierte un PowerPoint en un borrador de clase.')
    lector.add_argument('pptx', help='el archivo .pptx')
    lector.add_argument('numero', help='número de la clase, con dos cifras: 03')
    lector.add_argument('--titulo', help='título de la clase (por defecto, el de la primera diapositiva)')
    lector.add_argument('--resumen', default='', help='una o dos frases para la portada del sitio')
    lector.add_argument('--fecha', default='', help='fecha de la clase: 2026-12-02')
    lector.add_argument('--duracion', default='', help='por ejemplo: "50 min"')
    lector.add_argument('--pisar', action='store_true', help='sobrescribe la clase si ya existe')
    args = lector.parse_args()

    if not re.fullmatch(r'[\w-]{1,24}', args.numero):
        sys.exit('El número de clase solo puede llevar letras, cifras y guiones: 03, 12, extra-1…')
    origen = Path(args.pptx)
    if not origen.is_file():
        sys.exit('No encuentro ' + str(origen))
    destino = RAIZ / 'clases' / ('clase-%s.js' % args.numero)
    if destino.exists() and not args.pisar:
        sys.exit('%s ya existe. Añade --pisar si de verdad quieres sustituirla.' % destino.relative_to(RAIZ))

    carpeta_img = RAIZ / 'img' / ('clase-%s' % args.numero)
    avisos = []

    with zipfile.ZipFile(origen) as zf:
        presentacion = ET.fromstring(zf.read('ppt/presentation.xml'))
        rels = relaciones(zf, 'ppt/presentation.xml')
        rutas = [rels[s.get(R_ID)][1] for s in presentacion.findall('p:sldIdLst/p:sldId', NS)
                 if s.get(R_ID) in rels]
        if not rutas:
            sys.exit('Ese archivo no tiene diapositivas.')

        guardadas = {}

        def guardar_imagen(ruta_zip):
            if ruta_zip in guardadas:
                return guardadas[ruta_zip]
            extension = posixpath.splitext(ruta_zip)[1].lower()
            if extension not in IMAGENES:
                avisos.append('imagen %s: el navegador no pinta %s; expórtala a PNG y añádela a mano'
                              % (posixpath.basename(ruta_zip), extension or 'ese formato'))
                guardadas[ruta_zip] = None
                return None
            carpeta_img.mkdir(parents=True, exist_ok=True)
            nombre = 'imagen-%02d%s' % (len([v for v in guardadas.values() if v]) + 1, extension)
            (carpeta_img / nombre).write_bytes(zf.read(ruta_zip))
            guardadas[ruta_zip] = 'img/clase-%s/%s' % (args.numero, nombre)
            return guardadas[ruta_zip]

        diapos = [convertir(leer_diapositiva(zf, ruta), i, guardar_imagen) for i, ruta in enumerate(rutas)]

    clase = {'id': args.numero, 'titulo': args.titulo or diapos[0].get('titulo') or 'Clase ' + args.numero}
    if args.resumen:
        clase['resumen'] = args.resumen
    if args.fecha:
        clase['fecha'] = args.fecha
    if args.duracion:
        clase['duracion'] = args.duracion
    clase['diapos'] = diapos

    cabecera = (
        '/* ' + '=' * 74 + '\n'
        '   CLASE %s · %s\n'
        '   ' + '-' * 74 + '\n'
        '   Borrador sacado de «%s» con herramientas/pptx_a_clase.py.\n'
        '   Está por repasar: los tipos de diapositiva se han elegido a ojo de\n'
        '   máquina. El muestrario de lo que se puede hacer es clases/clase-00.js.\n'
        '   ' + '=' * 74 + ' */\n'
    ) % (args.numero, clase['titulo'], origen.name)
    destino.write_text(cabecera + 'NAVE.clase(' + json.dumps(clase, ensure_ascii=False, indent=2) + ');\n',
                       encoding='utf-8')

    tipos = {}
    for d in diapos:
        tipos[d['tipo']] = tipos.get(d['tipo'], 0) + 1
    print('Escrita %s: %d diapositivas (%s).' % (
        destino.relative_to(RAIZ), len(diapos),
        ', '.join('%d %s' % (n, t) for t, n in sorted(tipos.items()))))
    imagenes = [v for v in guardadas.values() if v]
    if imagenes:
        print('Imágenes en %s: %d.' % (carpeta_img.relative_to(RAIZ), len(imagenes)))
    for aviso in avisos:
        print('AVISO · ' + aviso)
    print("Falta un paso: añadir '%s' a la lista «clases» de clases/indice.js." % args.numero)


if __name__ == '__main__':
    main()
