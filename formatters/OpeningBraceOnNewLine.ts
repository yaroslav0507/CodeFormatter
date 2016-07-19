import * as ts from "typescript";
import * as f from "../Formatter";
import { FormatCodeOptions } from "../FormatCodeOptions";
import { getIsRuleEnabled } from "../TslintProvider";
import { Options } from "../Processor";
import * as Linter from "tslint";

class Formatter implements f.Formatter
{
	public name: string;
	private _lintRuleName: string = "crm-braces-own-line";
	public isApplicable(formatOptions: FormatCodeOptions): boolean
	{
		return getIsRuleEnabled(formatOptions.TsLintRules[this._lintRuleName]);
	}

	public format(sourceFile: ts.SourceFile, opts: Options, formatOptions: FormatCodeOptions)
		: f.TextChange[]
	{
		const edits: f.TextChange[] = [];
		const configuration: any = { rules: { } };
		configuration.rules[this._lintRuleName] = formatOptions.TsLintRules[this._lintRuleName];
		
		const linter = new Linter(
			sourceFile.fileName, sourceFile.getFullText(),
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
			const node = (ts as any).getTokenAtPosition(sourceFile, startPos) as ts.Node;
			const indentation = f.getLineIndentation(node);
			const stringToInsert = formatOptions.NewLineCharacter + indentation;
			
			const textChange = { 
				span: { start: node.getFullStart(), length: startPos - node.getFullStart() },
				newText: stringToInsert,
				priority: i
			};
			edits.push(textChange);
		}		
		return edits;
	}
}

export { Formatter };
