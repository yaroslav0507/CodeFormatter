global.Promise = require("bluebird");
import * as fs from "fs";
import * as ts from "typescript";
import { makeFormatCodeOptions } from "./TslintProvider";
import { Formatter, formatString } from "./Formatter";
import { createDefaultFormatCodeOptions, FormatCodeOptions } from "./FormatCodeOptions";


function processFile(fileName: string, context: Context): Promise<Result>
{
	if (!fs.existsSync(fileName))
	{
		let result: Result = {
			fileName: fileName,
			options: null,
			message: `${fileName} does not exist. process abort.\n`,
			error: true,
			src: "",
			dest: "",
			hasChanged: false,
		};
		return Promise.resolve(result);
	}
	else
	{
		const formatOptionsPromise = loadConfiguration(fileName, context);
		
		return formatOptionsPromise.then(formatOptions =>
			{
				const content = fs.readFileSync(fileName).toString();
				const result = processString(fileName, content, context, formatOptions);
				const opts = context.opts;
				if (opts && result.hasChanged)
				{
					if (opts.dryRun)
					{
						console.log(`file ${fileName}:`);
						console.log(result.dest);
					}
					else if (opts.replace)
					{
						fs.writeFileSync(fileName, result.dest);
						result.message = `replaced ${fileName}`;
					}
				}
				return Promise.resolve(result);
			});
	}
}

function processFiles(files: string[], context: Context): Promise<ResultMap>
{
	let resultMap: ResultMap = {};
	let promises = files.map(fileName =>
	{
		return processFile(fileName, context);
	});
	return Promise.all<Result>(promises).then(resultList =>
	{
		resultList.forEach(result =>
		{
			resultMap[result.fileName] = result;
		});
		return resultMap;
	});
}

function loadConfiguration(fileName: string, context: Context): Promise<FormatCodeOptions>
{
	let optGenPromises: (FormatCodeOptions | Promise<FormatCodeOptions>)[] = [];
	const opts = context.opts;

	let formatOptions = createDefaultFormatCodeOptions();
	if (opts.tslint)
	{
		makeFormatCodeOptions(fileName, context, formatOptions);
		optGenPromises.push(formatOptions);
	}
	return Promise
		.all(optGenPromises)
		.then(() =>
		{
			return Promise.resolve(formatOptions);
		});
}

function processString(
	fileName: string, content: string, 
	context: Context, formatOptions: FormatCodeOptions): Result
{
	const opts = context.opts;
	let formattedCode = formatString(fileName, content, context, formatOptions);
	// TODO: consider creating a separate formatter which makes sure files have the same
	// style of ending.
	// if ((formattedCode as any).trimRight)
	// {
	// 	formattedCode = (formattedCode as any).trimRight();
	// 	formattedCode += formatOptions.NewLineCharacter;
	// }

	// replace newline code. maybe NewLineCharacter params affect to only "new" newline by language service.
	formattedCode = formattedCode.replace(/\r?\n/g, formatOptions.NewLineCharacter);

	let message: string;
	let error = false;
	let hasChanged = content !== formattedCode;
	let result: Result = {
		fileName: fileName,
		options: formatOptions,
		message: message,
		error: error,
		src: content,
		dest: formattedCode,
		hasChanged: hasChanged,
	};
	return result;
}

interface ResultMap
{
	[fileName: string]: Result;
}

interface Result
{
	fileName: string;
	options: FormatCodeOptions;
	message: string;
	error: boolean;
	src: string;
	dest: string;
	hasChanged: boolean;
}

interface TslintRules
{
	[ruleName: string]: any;
}

interface TslintSettings 
{
	rules: TslintRules;
}

interface TslintSettingsMap
{
	[fileName: string]: TslintSettings;
}

interface Context
{
	opts: Options;
	formatters?: Formatter[];
	tslintSettingsMap?: TslintSettingsMap;
}

interface Options
{
	dryRun?: boolean;
	verbose?: boolean;
	baseDir?: string;
	formattersDir?: string;
	replace: boolean;
	tslint: boolean;
	tslintRulesDir?: string;
}

export { 
	loadConfiguration,
	processFiles, processString, 
	ResultMap, Result, 
	TslintRules, TslintSettings, TslintSettingsMap, 
	Context, Options 
};
