import * as ts from "typescript";

import * as path from "path";
import * as fs from "fs";

import { Context, TslintSettings, TslintSettingsMap } from "./Processor";
import { FormatCodeOptions } from "./FormatCodeOptions";
import { getConfigFileName } from "./Helper";


function makeFormatCodeOptions(
	fileName: string, context: Context, formatOptions: FormatCodeOptions): void
{
	let baseDir = context.opts.baseDir ? path.resolve(context.opts.baseDir) : path.dirname(path.resolve(fileName));
	let configFileName = getConfigFileName(baseDir, "tslint.json");
	if (configFileName) 
	{
		if (!context.tslintSettingsMap)
			context.tslintSettingsMap = {};
		const tslintSettingsCached = context.tslintSettingsMap[configFileName];
		if (tslintSettingsCached)
		{
			if (tslintSettingsCached.rules)
				formatOptions.TsLintRules = tslintSettingsCached.rules;
		}
		else
		{
			if (context.opts.verbose) 
				console.log(`Read "${configFileName}"`); 

			let config: TslintSettings = JSON.parse(<any>fs.readFileSync(configFileName, "utf-8"));
			context.tslintSettingsMap[configFileName] = config;
			if (config.rules) 
				formatOptions.TsLintRules = config.rules;
		}
	}
	else
	{
		if (context.opts.verbose)
			console.log(`Could not find a tslint.json file at ${baseDir}`);
	}
}

function getIsRuleEnabled(value: any): boolean
{
	let result: boolean = null;
	if (typeof value === "boolean")
		result = value as boolean;
	if (!result 
		&& Array.isArray(value)
		&& typeof (value as [])[0] === "boolean")
	{
		result = (value as [])[0] as boolean;
	}
	return result;
}

function getRuleHasOption(value: any, option: string): boolean
{
	return Array.isArray(value) && (value as []).indexOf(option) !== -1;
}

export { makeFormatCodeOptions, getIsRuleEnabled, getRuleHasOption }