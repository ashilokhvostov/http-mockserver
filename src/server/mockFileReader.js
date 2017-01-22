const Q = require('q');
const fs = require('fs');
const path = require('path');
const readDir = require('recursive-readdir');
const listenerService = require('./listenerService.js');

const mockFileReader = {};

function getFiles (dirname) {
	return Q.Promise((resolve, reject) => {
		readDir(dirname, (err, filenames) => {
			if (err) {
				reject(err);
				return;
			}

			const files = filenames
				.filter(filename => ['.json', '.js'].includes(path.extname(filename)))
				.map(getFile);

			resolve(files);
		});
	});
}

function getFile (filename) {
	try {
		return {
			name: filename,
			content: require(path.resolve(filename))
		};
	} catch (e) {
		console.log(`Error loading ${filename}`, e);
		throw e;
	}
}

function parseFile (filename, fileContent) {
	switch (path.extname(filename)) {
		case '.json': return parseJsonFile(filename, fileContent);
		case '.js': return parseJsFile(filename, fileContent);
	}
}

function parseJsonFile (filename, mockConfigs) {
	mockConfigs = Array.isArray(mockConfigs) ? mockConfigs : [mockConfigs];

	try {
		mockConfigs.map(addRoute);
	} catch (e) {
		console.log(`Error parsing ${filename}`, e);
	}
}

function parseJsFile (filename, handler) {
	try {
		return handler(addRoute);
	} catch (e) {
		console.log(`Error parsing ${filename}`, e);
	}
}

function addRoute (mockConfig) {
	return listenerService.addRoute(mockConfig.port, mockConfig);
}

mockFileReader.addMocks = function (filePaths = []) {
	filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];

	filePaths.forEach(filePath => {
		const isFile = fs.lstatSync(filePath).isFile();
		if (isFile) {
			const file = getFile(filePath);
			return parseFile(file.name, file.content);
		}

		return getFiles(filePath)
			.then(files => {
				return files.map(file => parseFile(file.name, file.content));
			})
			.catch(err => {
				console.log(`Error loading files ${filePath}`, err);
			});
	});
};

module.exports = mockFileReader;
