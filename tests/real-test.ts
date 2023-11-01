import { SplitterConfig, splitMap } from "../src";

const config: SplitterConfig = {
	inputFilePath: 'tests/untitled4.json',
	outputFolderPath: 'tests/untitled4_chunks',
	chunkWidth: 16,
	chunkHeight: 16,
}

splitMap(config)