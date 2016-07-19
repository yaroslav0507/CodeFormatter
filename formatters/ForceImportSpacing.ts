import * as ts from "typescript";
import * as f from "../Formatter";
import { FormatCodeOptions } from "../FormatCodeOptions";
import { getIsRuleEnabled, getRuleHasOption } from "../TslintProvider";
import { Options } from "../Processor";
import * as Linter from "tslint";

class Formatter implements f.Formatter
{
	public name: string;
	private _lintRuleName: string = "crm-force-import-spacing";
	private _forceNoSpace: string = "force-no-space";
	private _forceSingleSpace: string = "force-single-space";
	
	public isApplicable(formatOptions: FormatCodeOptions): boolean
	{
		return getIsRuleEnabled(formatOptions.TsLintRules[this._lintRuleName]);
	}

	public format(sourceFile: ts.SourceFile, opts: Options, formatOptions: FormatCodeOptions)
		: f.TextChange[]
	{
		const edits: f.TextChange[] = [];
		const configuration: any = { rules: { } };
		const ruleOptions = configuration.rules[this._lintRuleName] = formatOptions.TsLintRules[this._lintRuleName];
		let forceNoSpace = getRuleHasOption(ruleOptions, this._forceNoSpace);
		let forceSingleSpace = getRuleHasOption(ruleOptions, this._forceSingleSpace);
		// There's no need to proceed if both rules are actually disabled.
		if (forceNoSpace || forceSingleSpace)
		{
			const sourceFileText = sourceFile.getFullText();
			const linter = new Linter(
				sourceFile.fileName, sourceFileText,
				{
					configuration: configuration,
					rulesDirectory: opts.tslintRulesDir
				});
			const lintingResult = linter.lint();
			
			if (opts.verbose)
			{
				const lintOutput = lintingResult.output.trim();
				if (lintOutput)
					console.log(lintingResult.output);
			}
			for (let i = lintingResult.failures.length - 1; i >= 0; i--)
			{
				const failure = lintingResult.failures[i];
				
				const startPos = failure.getStartPosition().getPosition();
				const endPos = failure.getEndPosition().getPosition();
				const sourceSpan = sourceFileText.slice(startPos, endPos);
				// Perform a basic check, just in case:
				if (sourceSpan[0] !== "{" || sourceSpan[sourceSpan.length - 1] !== "}")
					throw new Error("The span of interest must be bound by { and }");
				const cleanSpanContent = sourceSpan.slice(1, -1).trim();
				
				let stringToInsert = sourceSpan;
				if (forceNoSpace)
					stringToInsert = "{" + cleanSpanContent + "}";
				else if (forceSingleSpace)
					stringToInsert = "{ " + cleanSpanContent + " }";
				
				const textChange = { 
					span: { start: startPos, length: endPos - startPos },
					newText: stringToInsert,
					priority: i
				};
				edits.push(textChange);
			}
		}		
		return edits;
	}
}

export { Formatter };
