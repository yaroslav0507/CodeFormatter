import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import { Options } from "./Processor";
import { Formatter } from "./Formatter";
import { FormatCodeOptions } from "./FormatCodeOptions";

function loadFormatters(
	opts: Options
): Formatter[]
{
	const result: Formatter[] = [];
	if (opts.formattersDir)
	{
		const dirPathAbsolute = path.resolve(__dirname, opts.formattersDir);
		const fileNames = fs.readdirSync(dirPathAbsolute);
		for (let fileName of fileNames)
		{
			const fullFileName = path.join(dirPathAbsolute, fileName);
			const formatterModule = require(fullFileName);
			if (formatterModule && formatterModule.Formatter)
			{
				const formatter = new formatterModule.Formatter();
				formatter.name = fileName.split(".").shift();
				result.push(formatter);
				if (opts.verbose)
					console.log(`Loaded a formatter at ${fullFileName}`);
			}
		}
	}
	return result;
}

function getFormatterName(fileName: string): string
{
	let result = "";
	if (fileName)
	{
		result = fileName.slice(0, fileName.lastIndexOf("."));
	}
	return result;
}

export { loadFormatters };
