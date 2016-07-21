import * as ts from "typescript";
import * as f from "../Formatter";
import { FormatCodeOptions } from "../FormatCodeOptions";
import { getIsRuleEnabled } from "../TslintProvider";
import { Options } from "../Processor";
import * as Lint from "tslint/lib/lint";
import * as Linter from "tslint";

interface IJsDoc
{
    text: string;
    startPosition: number;
    endPosition: number;
    leadingTrivia: string;
    endingTrivia: string;
}

class Formatter implements f.Formatter
{
    public name: string;
    public edits: f.TextChange[] = [];

    private _sourceFile: ts.SourceFile;
    private _opts: Options;
    private _formatOptions: FormatCodeOptions;
    private _lintRuleName: string = "jsdoc-format";

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
        this._showVerboseLog(ruleFailures);

        const jsDocComments = this._getJsDocComments(ruleFailures);

        jsDocComments.forEach((comment, index) => {

            let lines = comment.text.split("\r\n");

            // filter blank lines
            lines = lines.filter((line: string) => {
                return !/^\s*$/.test(line);
            });

            // here we check position of the first asterisk character for future alignment of others
            const properAsteriskPosition = lines[0].indexOf("*");

            // here we remove all spaces because we'll add leading trivia to the JSDoc comment
            lines[0] = lines[0].trim();

            for ( let i = 1; i < lines.length; i++)
            {
                let lineAsteriskPosition = lines[i].indexOf("*");
                let asteriskPositionDiff = properAsteriskPosition - lineAsteriskPosition;

                if(asteriskPositionDiff >= 0)
                {
                    let spaces = this._generateSpaces(asteriskPositionDiff);
                    lines[i] = spaces + lines[i];
                } else {
                    lines[i] = lines[i].substr(Math.abs(asteriskPositionDiff));
                }
            }

            const fixedComment = comment.leadingTrivia + lines.join("\r\n") + comment.endingTrivia;
            const width = comment.endPosition - comment.startPosition;

            const formattedJsDoc = {
                span: { start: comment.startPosition, length: width },
                newText: fixedComment,
                priority: index,
            };

            this.edits.push(formattedJsDoc);
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

    private _showVerboseLog(ruleFailures: any): void
    {
        if (this._opts.verbose)
        {
            const lintOutput = ruleFailures.output.trim();
            if (lintOutput)
                console.log(ruleFailures.output);
        }
    }

    private _generateSpaces(qty: number): string
    {
        return new Array(qty + 1).join(" ");
    }

    private _getJsDocComments(ruleFailures: Lint.RuleFailure[]): IJsDoc[]
    {
        let jsDocComments: IJsDoc[] = [];

        for (let i = ruleFailures.length - 1; i >= 0; i--)
        {
            const JS_DOCK_START_STATEMENT = "/**";
            const JS_DOCK_END_STATEMENT = "*/";

            const failure = ruleFailures[i];
            const failureStartPosition = failure.getStartPosition().getPosition();

            const node = (ts as any).getTokenAtPosition(this._sourceFile, failureStartPosition) as ts.Node;
            const startPosition = node.getFullStart();
            const endPosition = startPosition + node.getLeadingTriviaWidth();
            const fullText = node.getFullText().slice(0, endPosition);

            let leadingTrivia = fullText.split(JS_DOCK_START_STATEMENT)[0];
            let endingTrivia = fullText.split(JS_DOCK_END_STATEMENT)[1];
                endingTrivia = /^\s*/.exec(endingTrivia)[0];

            const jsDocWidth = fullText.indexOf(JS_DOCK_END_STATEMENT) + JS_DOCK_END_STATEMENT.length;
            const text = fullText.substr(0, jsDocWidth);

            if(!jsDocComments.some(item => (item.text === text)))
                jsDocComments.push({
                    text,
                    startPosition,
                    endPosition,
                    leadingTrivia,
                    endingTrivia
                });
        }
        return jsDocComments;
    }
}

export { Formatter };