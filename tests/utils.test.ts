import { changeRelativePathToNewLocation, range } from "../src/utils"

test('basic range test', () => {
	const r = range(123)
	expect(r.length).toBe(123)

	for (let i = 0; i < 123; i++) {
		expect(r[i]).toBe(i)
	}
})

test('empty range', () => {
	const r = range(0)
	expect(r.length).toBe(0)
})

test('negative range', () => {
	expect(() => {
		range(-1)
	}).toThrow()
})

test('test changing path', () => {
	//todo probably doesn't cover all possibilities
	expect(changeRelativePathToNewLocation('/home', '/newhome', '.')).toBe('../home')
	expect(changeRelativePathToNewLocation('/home', '/newhome', './abc')).toBe('../home/abc')
	expect(changeRelativePathToNewLocation('/home', '/home', 'a')).toBe('a')
	expect(changeRelativePathToNewLocation('~/test', '~/abc/def', '../../a.pdf')).toBe('../../../a.pdf')
})