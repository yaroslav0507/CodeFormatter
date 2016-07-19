import * as path from "path";
import * as fs from "fs";

function getConfigFileName(baseDir: string, configFileName: string): string
{
	let configFilePath = path.resolve(baseDir, configFileName);
	if (fs.existsSync(configFilePath))
	{
		return configFilePath;
	}

	if (baseDir.length === path.dirname(baseDir).length)
	{
		return null;
	}

	return getConfigFileName(path.resolve(baseDir, "../"), configFileName);
}

export { getConfigFileName };
