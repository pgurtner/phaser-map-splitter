import { existsSync, mkdirSync, readFileSync } from 'fs'
import { writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { changeRelativePathToNewLocation, range } from './utils'
import { fromByteArray, toByteArray } from 'base64-js'

export interface SplitterConfig {
	inputFilePath: string
	outputFolderPath: string
	chunkWidth: number
	chunkHeight: number
	fs?: {
		existsSync: typeof existsSync,
		mkdirSync: typeof mkdirSync,
		readFileSync: typeof readFileSync,
		writeFile: typeof writeFile
	}
}

export interface MapMasterFile {
	chunkWidth: number
	chunkHeight: number
	horizontalChunkAmount: number
	verticalChunkAmount: number
	layerAmount: number
	mapHeight: number
	mapWidth: number
	tileWidth: number
	tileHeight: number
	layers: unknown[]
	tilesets: unknown[]
}

export async function splitMap(config: SplitterConfig): Promise<undefined> {
	if (!config.inputFilePath || !config.outputFolderPath) {
		throw 'invalid arguments, inputFilePath and outputFolderPath must be set'
	}

	if (config.fs === undefined) {
		config.fs = {
			existsSync, mkdirSync, readFileSync, writeFile
		}
	}

	if (!config.fs.existsSync(config.outputFolderPath)) {
		config.fs.mkdirSync(config.outputFolderPath)
	}

	const mapFileContent = config.fs.readFileSync(config.inputFilePath, { encoding: 'utf8' })
	const mapContent = JSON.parse(mapFileContent)
	const master = createMasterFile(mapContent, config.chunkWidth, config.chunkHeight, config.inputFilePath, config.outputFolderPath)
	const chunks = createChunks(mapContent, master)

	const chunkFileWritePromises = chunks.map((chunk) => {
		if (config.fs === undefined) {
			throw 'config.fs suddenly got undefined'
		}
		const chunkFilePath = join(config.outputFolderPath, `chunk${chunk.id}.json`)
		return config.fs.writeFile(chunkFilePath, JSON.stringify(chunk))
	})

	for (const p of chunkFileWritePromises) {
		await p
	}
}

function createMasterFile(
	map,
	chunkWidth: number,
	chunkHeight: number,
	inputFilePath: string,
	outputFolderPath: string
): MapMasterFile {
	const mapWidth = map.width
	const mapHeight = map.height
	const horizontalChunkAmount = Math.ceil(mapWidth / chunkWidth)
	const verticalChunkAmount = Math.ceil(mapHeight / chunkHeight)

	return {
		chunkWidth,
		chunkHeight,
		horizontalChunkAmount,
		verticalChunkAmount,
		layerAmount: map.layers.length,
		mapHeight: map.height,
		mapWidth: map.width,
		tileWidth: map.tilewidth,
		tileHeight: map.tileheight,
		layers: map.layers.filter(layer => layer.type !== 'tilelayer'),
		tilesets: map.tilesets.map((tileset) => ({
			...tileset,
			image: changeRelativePathToNewLocation(dirname(inputFilePath), outputFolderPath, tileset.image),
		})),
	}
}

function createChunks(map, master: MapMasterFile) {
	const totalChunkAmount = master.horizontalChunkAmount * master.verticalChunkAmount
	return range(totalChunkAmount).map((chunkId) => createChunk(map, master, chunkId))
}

function createChunk(map, master: MapMasterFile, chunkId: number) {
	const { chunkWidth, chunkHeight, horizontalChunkAmount, mapHeight, mapWidth } = master

	const chunkTopLeftX = (chunkId % horizontalChunkAmount) * chunkWidth
	const chunkTopLeftY = (chunkId / horizontalChunkAmount) * chunkHeight

	const chunk = {
		...map,
		id: chunkId,
		width: Math.min(chunkWidth, mapWidth - chunkTopLeftX),
		height: Math.min(chunkHeight, mapHeight - chunkTopLeftY),
		layers: map.layers
			.filter((layer) => layer.type === 'tilelayer')
			.map(createLayerChunk(master, chunkTopLeftX, chunkTopLeftY)),
	}

	return chunk
}

function createLayerChunk(master: MapMasterFile, chunkTopLeftX: number, chunkTopLeftY: number) {
	return (layer) => {
		return {
			...layer,
			width: master.chunkWidth,
			height: master.chunkHeight,
			data: extractChunkFromTileLayer(layer, master, chunkTopLeftX, chunkTopLeftY),
		}
	}
}

function extractChunkFromTileLayer(layer, master: MapMasterFile, chunkTopLeftX: number, chunkTopLeftY: number) {
	const { mapWidth, chunkWidth, chunkHeight } = master
	const liststart = mapWidth * chunkTopLeftY + chunkTopLeftX

	const decodedTiles = decodeTiles(layer)

	const extractedTiles = range(chunkHeight)
		.map((y) => {
			const begin = liststart + y * mapWidth
			const end = begin + chunkWidth
			return decodedTiles.slice(begin, end)
		})
		.flat()
		.reduce((prev, item) => {
			const newArr = new Uint32Array(prev.length + item.length)
			newArr.set(prev)
			newArr.set(item, prev.length)
			return newArr
		}, new Uint32Array())
	
	return encodeTiles(layer, extractedTiles)
}

function decodeTiles (layer): Uint32Array {
	if (layer.compression !== "") {
		throw 'doesnt support file compression'
	}
	if (layer.encoding === 'base64') {
		const uint8 = toByteArray(layer.data)
		const uint32 = new Uint32Array(uint8.buffer)
		return uint32
	} else {
		return layer.data
	}
}

function encodeTiles (layer, extractedTiles) {
	if (layer.encoding === 'base64') {
		const uint8 = new Uint8Array(extractedTiles.buffer)
		return fromByteArray(uint8)
	} else {
		return extractedTiles
	}
}