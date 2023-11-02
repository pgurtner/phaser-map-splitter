import { existsSync, mkdirSync, readFileSync } from "fs";
import { SplitterConfig, changeFilepaths, splitMap } from "../src";
import { basename, dirname, join } from "path";
import { writeFile } from "fs/promises";

main('tests/map_tests/untitled.json')

async function main (mapFilePath: string) {
	const oldPosition = dirname(mapFilePath)
	const fileName = basename(mapFilePath)
	const newPosition = join(oldPosition, `${fileName.slice(0, -5)}_chunks`)

	if (!existsSync(newPosition)) {
		mkdirSync(newPosition)
	}

	const rawMap = readFileSync(join(oldPosition, fileName), {encoding: 'utf-8'})
	const map = JSON.parse(rawMap)

	const config: SplitterConfig = {
		map,
		chunkWidth: 4,
		chunkHeight: 4,
	}

	const { master, chunks } = splitMap(config)
	changeFilepaths(master, oldPosition, newPosition)
	chunks.forEach(chunk => changeFilepaths(chunk, oldPosition, newPosition))

	const fileWriteProms = [
		writeFile(join(newPosition, 'master.json'), JSON.stringify(master)),
		chunks.map(chunk => writeFile(join(newPosition, `chunk${chunk.id}.json`), JSON.stringify(chunk)))
	].flat(2)

	for (const fwProm of fileWriteProms) {
		await fwProm
	}
}