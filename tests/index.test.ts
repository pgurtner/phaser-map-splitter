import { PathLike, PathOrFileDescriptor, readFileSync } from "fs"
import { SplitterConfig, splitMap } from "../src"

test('std map splitting', () => {
	const testMapRaw = readFileSync('tests/testmap.json', {encoding: 'utf8'})
	const testMap = JSON.parse(testMapRaw)
	const existsSyncCalls: [path: PathLike][] = []
	const mkdirSyncCalls: any[] = []
	const readFileSyncCalls: PathOrFileDescriptor[][] = []
	const writeFileCalls: any[] = []

	const config: SplitterConfig = {
		inputFilePath: 'input',
		outputFolderPath: 'output',
		chunkWidth: 32,
		chunkHeight: 32,
		fs: {
			existsSync: (...args) => {
				existsSyncCalls.push(args)
				return true
			},
			mkdirSync: (...args) => {
				mkdirSyncCalls.push(args)
				return undefined
			},
			readFileSync: (path: PathOrFileDescriptor, ...args): any => {
				readFileSyncCalls.push([path].concat(...args))
				if (path === 'input') {
					return testMapRaw
				} else {
					throw 'invalid file path'
				}
			},
			writeFile: (...args) => {
				writeFileCalls.push(args)
				return new Promise(resolve => resolve())
			}
		}
	}

	const prom = splitMap(config)

	expect(existsSyncCalls.length).toBe(1)
	expect(mkdirSyncCalls.length).toBe(0)

	expect(readFileSyncCalls.length).toBe(1)
	expect(readFileSyncCalls[0][0]).toEqual('input')

	const horizontalChunkAmount = Math.ceil(testMap.width / config.chunkWidth)
	const verticalChunkAmount = Math.ceil(testMap.height / config.chunkHeight)
	const totalChunkAmount = horizontalChunkAmount*verticalChunkAmount
	expect(writeFileCalls.length).toBe(totalChunkAmount)

	return prom.then(data => expect(data).toBeUndefined())
})