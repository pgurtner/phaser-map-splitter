import { changeRelativePathToNewLocation, range } from './utils'
import { fromByteArray, toByteArray } from 'base64-js'

export interface SplitterConfig {
	map: any
	chunkWidth: number
	chunkHeight: number
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
	globalLayers: unknown[]
	tilesets: unknown[]
}

export function changeFilepaths(
	tiledEntity: MapMasterFile | Record<string, unknown>,
	oldPosition: string,
	newPosition: string
) {
	if (Array.isArray(tiledEntity.tilesets)) {
		tiledEntity.tilesets = tiledEntity.tilesets.map((tileset) => ({
			...tileset,
			image: changeRelativePathToNewLocation(oldPosition, newPosition, tileset.image),
		}))
	}
}

export async function splitMap(config: SplitterConfig): Promise<{ master: MapMasterFile; chunks: Record<string, unknown>[] }> {
	if (
		config.chunkHeight <= 0 ||
		config.chunkWidth <= 0 ||
		!Number.isInteger(config.chunkHeight) ||
		!Number.isInteger(config.chunkWidth)
	) {
		throw 'chunk side lengths must be positive integers'
	}

	const master = createMasterFile(config)
	const chunks = await createChunks(config.map, master)

	return {
		master,
		chunks,
	}
}

function createMasterFile(config: SplitterConfig): MapMasterFile {
	const map = config.map
	const mapWidth = map.width
	const mapHeight = map.height
	const horizontalChunkAmount = Math.ceil(mapWidth / config.chunkWidth)
	const verticalChunkAmount = Math.ceil(mapHeight / config.chunkHeight)

	return {
		chunkWidth: config.chunkWidth,
		chunkHeight: config.chunkHeight,
		horizontalChunkAmount,
		verticalChunkAmount,
		layerAmount: map.layers.length,
		mapHeight: map.height,
		mapWidth: map.width,
		tileWidth: map.tilewidth,
		tileHeight: map.tileheight,
		globalLayers: map.layers.filter((layer) => layer.type !== 'tilelayer'),
		tilesets: map.tilesets,
	}
}

async function createChunks(map, master: MapMasterFile) {
	const totalChunkAmount = master.horizontalChunkAmount * master.verticalChunkAmount
	map.layers.filter(layer => layer.type === "tilelayer").forEach(layer => layer.data = decodeTiles(layer))

	return Promise.all(range(totalChunkAmount).map((chunkId) => createChunk(map, master, chunkId)))
}

async function createChunk(map, master: MapMasterFile, chunkId: number) {
	const { chunkWidth, chunkHeight, horizontalChunkAmount, mapHeight, mapWidth } = master

	const chunkTopLeftX = (chunkId % horizontalChunkAmount) * chunkWidth
	const chunkTopLeftY = Math.floor(chunkId / horizontalChunkAmount) * chunkHeight

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
			width: Math.min(master.chunkWidth, master.mapWidth - chunkTopLeftX),
			height: Math.min(master.chunkHeight, master.mapHeight - chunkTopLeftY),
			data: extractChunkFromTileLayer(layer, master, chunkTopLeftX, chunkTopLeftY),
		}
	}
}

function extractChunkFromTileLayer(layer, master: MapMasterFile, chunkTopLeftX: number, chunkTopLeftY: number) {
	const { mapWidth, chunkWidth, chunkHeight } = master
	const liststart = mapWidth * chunkTopLeftY + chunkTopLeftX

	const remainingRows = Math.min(chunkHeight, master.mapHeight - chunkTopLeftY)
	const remainingCols = Math.min(chunkWidth, master.mapWidth - chunkTopLeftX)

	const extractedTiles = range(remainingRows)
		.map((y) => {
			const begin = liststart + y * mapWidth
			const end = begin + remainingCols
			return layer.data.slice(begin, end)
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

function decodeTiles(layer): Uint32Array {
	if (layer.compression !== '') {
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

function encodeTiles(layer, extractedTiles) {
	if (layer.encoding === 'base64') {
		const uint8 = new Uint8Array(extractedTiles.buffer)
		return fromByteArray(uint8)
	} else {
		return extractedTiles
	}
}
