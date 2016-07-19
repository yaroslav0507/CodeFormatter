#! /usr/bin/env node

global.Promise = require("bluebird");
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import * as commandpost from "commandpost";
import * as processor from "./Processor";
import { getConfigFileName } from "./helper";

let packageJson = JSON.parse(fs.readFileSync(__dirname + "/../package.json").toString());

interface RootOptions
{
	replace: boolean;
	baseDir: string[];
	formattersDir: string[];
	dryRun: boolean;
	tslint: boolean;
	tslintRulesDir: string[];
	verbose: boolean;
}

interface RootArguments
{
	files: string[];
}

let root = commandpost
	.create<RootOptions, RootArguments>("ts-cfmt [files...]")
	.version(packageJson.version, "-v, --version")
	.option("-r, --replace", "replace .ts file")
	.option("--baseDir <path>", "config file lookup from <path>")
	.option("--formattersDir <path>", "formatters to use are looked up in <path>", "./formatters")
	.option("--no-tslint", "don't read a tslint.json")
	.option("--tslintRulesDir <path>", "tslint rules to use are looked up in <path>")
	.option("--dryRun", "outputs the changes to console")
	.option("--verbose", "makes output more verbose")
	.action((opts, args) =>
	{
		const replace = !!opts.replace;
		const baseDir = opts.baseDir ? opts.baseDir[0] : null;
		const formattersDir = opts.formattersDir ? opts.formattersDir[0] : null;
		const dryRun = !!opts.dryRun;
		const tslint = !!opts.tslint;
		const tslintRulesDir = opts.tslintRulesDir ? opts.tslintRulesDir[0] : null;
		const verbose = !!opts.verbose;

		let files = args.files;

		if (files.length === 0)
		{
			console.log(root.helpText());
			return;
		}

		if (verbose) 
		{
			console.log("  replace:             " + (replace ? "ON" : "OFF"));
			console.log("  baseDir:             " + path.resolve(baseDir ? baseDir : process.cwd()));
			console.log("  formattersDir:       " + (formattersDir ? formattersDir : null));
			console.log("  dryRun:              " + (dryRun ? "ON" : "OFF"));
			console.log("  tslint:              " + (tslint ? "ON" : "OFF"));
			console.log("  tslint rules dir:    " + (tslintRulesDir ? tslintRulesDir : null));
			console.log();
		}

		const fileList = expand(files);
		processor
			.processFiles(fileList, {
				opts: {
					replace: replace,
					baseDir: baseDir,
					formattersDir: formattersDir,
					dryRun: dryRun,
					tslint: tslint,
					tslintRulesDir: tslintRulesDir,
					verbose: verbose,
				}
			})
			.then(showResultHandler)
			.catch(errorHandler);

	});

commandpost
	.exec(root, process.argv)
	.catch(errorHandler);

function expand(inputFileList: string[]): string[]
{
	const result: string[] = [];
	const rootPath = process.cwd();
	inputFileList.forEach(fileName =>
	{
		fileName = path.resolve(rootPath, fileName);
		
		const fileStats = fs.statSync(fileName);
		if (fileStats.isDirectory())
		{
			const fileList: string[] = [];
			walkSync(fileName, fileList);
			fileList.forEach(subFileName =>
			{
				result.push(subFileName);
			});
		}
		else
		{
			result.push(fileName);
		}		
	});
	return result;
}

// List all files in a directory in Node.js recursively in a synchronous fashion
function walkSync(dir: string, filelist: string[]) : void
{
	if (fs.existsSync(dir))
	{
		const files = fs.readdirSync(dir);
		filelist = filelist || [];
		files.forEach(function(file) 
		{
			const fullFileName = path.join(dir, file);
			if (fs.statSync(fullFileName).isDirectory())
			{
				walkSync(fullFileName, filelist);
			}
			else 
			{
				if (/(?:(?:\.ts)|(?:\.tsx))$/.test(fullFileName) 
					&& !/(?:\.d)(?:(?:\.ts)|(?:\.tsx))$/.test(fullFileName)
					&& !/\bnode_modules\b/.test(fullFileName))
				{
					filelist.push(fullFileName);
				}
			}
		});
	}
}

function errorHandler(err: any): Promise<any>
{
	if (err instanceof Error)
	{
		console.error(err.stack);
	}
	else
	{
		console.error(err);
	}
	return Promise.resolve(null).then(() =>
	{
		process.exit(1);
		return null as any;
	});
}

function showResultHandler(resultMap: processor.ResultMap): Promise<any>
{
	let hasError = Object.keys(resultMap).filter(fileName => resultMap[fileName].error).length !== 0;
	if (hasError)
	{
		Object.keys(resultMap)
			.map(fileName => resultMap[fileName])
			.filter(result => result.error)
			.forEach(result => process.stderr.write(result.message));
		process.exit(1);
	}
	else
	{
		let hasChanges = Object.keys(resultMap).filter(fileName => resultMap[fileName].hasChanged).length !== 0;
		if (hasChanges)
		{
			Object.keys(resultMap)
				.map(fileName => resultMap[fileName])
				.forEach(result =>
				{
					if (result.message)
					{
						console.log(result.message);
					}
				});
		}
		else
		{
			console.log("No changes applied");
		}
	}
	return null;
}

function readFilesFromTsconfig(configPath: string)
{
	let tsconfigDir = path.dirname(configPath);
	let tsconfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
	if (tsconfig.files)
	{
		let files: string[] = tsconfig.files;
		return files.map(filePath => path.resolve(tsconfigDir, filePath));
	} 
	else
	{
		throw new Error(`No "files" or "filesGlob" section present in tsconfig.json`);
	}
}
