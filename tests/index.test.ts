import { readFileSync } from "fs"
import { SplitterConfig, splitMap } from "../src"

test('std map splitting', () => {
	const testMapRaw = readFileSync('tests/untitled.json', {encoding: 'utf8'})
	const testMap = JSON.parse(testMapRaw)

	const config: SplitterConfig = {
		map: testMap,
		chunkWidth: 2,
		chunkHeight: 2,
	}

	const {master, chunks} = splitMap(config)

	const horizontalChunkAmount = Math.ceil(testMap.width/2)
	const verticalChunkAmount = Math.ceil(testMap.height/2)
	const totalChunkAmount = horizontalChunkAmount*verticalChunkAmount

	expect(master.chunkHeight).toBe(2)
	expect(master.chunkWidth).toBe(2)
	expect(master.globalLayers.length).toBe((testMap.layers.filter(layer => layer.type !== 'tilelayer')).length)
	expect(master.horizontalChunkAmount).toBe(horizontalChunkAmount)
	expect(master.verticalChunkAmount).toBe(verticalChunkAmount)
	expect(master.mapHeight).toBe(testMap.height)
	expect(master.mapWidth).toBe(testMap.width)
	expect(master.tileHeight).toBe(testMap.tileheight)
	expect(master.tileWidth).toBe(testMap.tilewidth)
	expect(master.tilesets.length).toBe(testMap.tilesets.length)
	
	expect(chunks.length).toBe(totalChunkAmount)
})