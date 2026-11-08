# WikiDiffs

WikiDiffs es una web hecha a mano que agrupa las diferencias hechas por los criminales que tienen intervenidos todas mis comunicaciones y dispositivos.

Estos criminales espían, alteran mi software y comunicaciones de manera ilegal vulnerando varias leyes del código penal y de la constitución Española.

Yo expongo su rastro público de wikipedia de manera legal.


## Introducción

La web puede usarse sin conexión, sólo necesita ser servidor web que la sirva al cliente.
Al no tener backend los datos se cargan y guardan en el navegador.

La web ordena por categorías, alfabéticamente las diferencias hechas en artículos de Wikipedia y los usuarios colaboradores de esos artículos. Hay una sección para guardar diferencias y tomar notas en el navegador si lo crees conveniente.


## Instalación

En linux una forma sencilla sería:

```
git clone https://github.com/mod891/wikidiffs.git

cd wikidiffs

python3 -m http.server 8080
```
En windows si no tienes python puedes descargar un servidor web estilo WAMP, apache, etc... y servir la web desde el directorio del servidor web instalado.

En android instala termux desde una consola e instala python y git ```pkg install git python -y``` y igual que para linux.

## Creación de base de datos

* **[WikiDiffsBot](https://github.com/mod891/making-off/tree/master/wikiDiffsBot)** Un bot/crawler escrito en python que haciendo web scrapping descarga y construye las diferencias hechas en Wikipedia para un determinado usuario o rango IP y funcionar en esta web, puede cargar o crear en varios formatos de base de datos (TinyDB, sqlite y IndexedDB)

Cuando la base de datos está creada moverla a la carpeta donde se almacena la base de datos /resources/store/full

Las categorías y descripción hacen uso de chatgpt para analizar los enlaces y hacer un resumen.

Configura un user agent válido que te identifique en el script y también puedes contactar con wikimedia antes de realizar las peticiones para acordar cuantas puedes hacer por segundo no vaya a ser que te bloquee la IP.
