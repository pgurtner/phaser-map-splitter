import { relative, resolve } from "path"

export function changeRelativePathToNewLocation(oldDir: string, newDir: string, path: string): string {
	const absoluteTilesetPath = resolve(oldDir, path)
	return relative(newDir, absoluteTilesetPath)
}

export function range(n: number): number[] {
	if (n < 0) {
		throw 'range cap must be positive or 0'
	}
	return [...Array(n).keys()]
}