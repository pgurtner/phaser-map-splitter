TS package for splitting Tiled maps into chunks for dynamic loading in phaser3 games. This started based on this [blog post](https://www.dynetisgames.com/2018/02/24/manage-big-maps-phaser-3/).

This is still unfinished. Currently only base64 encoded uncompressed Tilemaps saved as JSON or tmj files are supported.

The data string is split in the usual left-to-right rows-before-columns way because that's how Tiled builds them. E. g. the chunk array ABCDEFGHI for a quadratic map would resemble (numbers are the chunk ids):
```
(0,A)	(1,B)	(2,C)
(3,D)	(4,E)	(5,F)
(6,G)	(7,H)	(8,I)
```
# how to use
```ts
import { splitMap, changeFilepaths } from "phaser-map-splitter"

async function main () {
	const map = JSON.parse(rawJSONMapContent)

	const config: SplitterConfig = {
		map,
		chunkWidth: 32,
		chunkHeight: 32,
	}

	const { master, chunks } = await splitMap(config)

	// if you want to put the master and chunks files in another location than the originial map file you have to adjust file paths in the new files
	changeFilepaths(master, oldPosition, newPosition)
	chunks.forEach(chunk => changeFilepaths(chunk, oldPosition, newPosition))
}
```

## master file
```ts
interface MapMasterFile {
	chunkWidth: number
	chunkHeight: number
	horizontalChunkAmount: number
	verticalChunkAmount: number
	layerAmount: number
	mapHeight: number
	mapWidth: number
	tileWidth: number
	tileHeight: number
	globalLayers: unknown[] //all layers except for tile layers
	tilesets: unknown[]
}
```
## chunk file
Chunk files copy all properties from the original map file with a few exceptions and additions:
 * id: is set to chunk id
 * width: is set to chunk width
 * height: is set to chunk height
 * layers: all tile layers in their chunked form

Keep in mind that chunks at the right and bottom border vary in size if the chunk dimensions aren't divisors of the map dimensions.

# todo
 * properly handle different types of encoding and compression
 * proper test coverage
 * proper type handling