import * as ts from "typescript";
import * as f from "../Formatter";
import { FormatCodeOptions } from "../FormatCodeOptions";
import { getIsRuleEnabled } from "../TslintProvider";
import { Options } from "../Processor";
import * as Lint from "tslint/lib/lint";
import * as Linter from "tslint";

class Formatter implements f.Formatter {
    public name: string;
    public edits: f.TextChange[] = [];

    private _sourceFile: ts.SourceFile;
    private _opts: Options;
    private _formatOptions: FormatCodeOptions;
    private _lintRuleName: string = "no-trailing-whitespace";

    public isApplicable(formatOptions: FormatCodeOptions): boolean
    {
        return getIsRuleEnabled(formatOptions.TsLintRules[this._lintRuleName]);
    }

    public format(sourceFile: ts.SourceFile, opts: Options, formatOptions: FormatCodeOptions): f.TextChange[]
    {
        this._sourceFile = sourceFile;
        this._opts = opts;
        this._formatOptions = formatOptions;

        const ruleFailures = this._lintSourceFile().failures;

        ruleFailures.forEach((failure, priority) =>
        {
            const start = failure.getStartPosition().getPosition();
            console.log("Start:", start);
            const end = failure.getEndPosition().getPosition();
            console.log("End: ", end, "\n\n");
            
            const updatedText = {
                span: { start, length: end - start },
                newText: "",
                priority,
            };
            
            this.edits.push(updatedText);
        });

        return this.edits;
    }


    private _lintSourceFile(): Lint.LintResult
    {
        const configuration: any = { rules: { } };

        configuration.rules[this._lintRuleName] = this._formatOptions.TsLintRules[this._lintRuleName];

        const linter = new Linter(
            this._sourceFile.fileName, this._sourceFile.getFullText(),
            {
                configuration: configuration,
                rulesDirectory: this._opts.tslintRulesDir
            });
        return linter.lint();
    }
}

export { Formatter };