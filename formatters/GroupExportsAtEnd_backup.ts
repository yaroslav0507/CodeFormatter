import * as ts from "typescript";
import * as f from "../Formatter";
import { FormatCodeOptions } from "../FormatCodeOptions";
import { getIsRuleEnabled } from "../TslintProvider";
import { Options } from "../Processor";
import * as Lint from "tslint/lib/lint";
import { format } from "url";

class Formatter implements f.Formatter
{
	public name: string;
	public edits: f.TextChange[] = [];

	private lintRuleName: string = "crm-group-exports-at-end";
	private exportDeclarations: any = [];
	private exportAssignments: any = [];
	private formatOptions: FormatCodeOptions;
	private sourceFile: ts.SourceFile;
	private opts: Options;

	public isApplicable(formatOptions: FormatCodeOptions): boolean
	{
		return getIsRuleEnabled(formatOptions.TsLintRules[this.lintRuleName]);
	}

	public format(sourceFile: ts.SourceFile, opts: Options, formatOptions: FormatCodeOptions): f.TextChange[]
	{
		this.sourceFile = sourceFile;
		this.opts = opts;
		this.formatOptions = formatOptions;
		this.edits = [];

		this._collectAllExportStatements();
		this._insertUnifiedExportDeclaration();

		return this.edits;
	}

	/**
	 * Checks if there are more then one export declarations and export assignments
	 * and starts DOM parsing
	 * @private
     */
	private _collectAllExportStatements(): void
	{
		let counter = {
			assignments: 0,
			declarations: 0
		};

		for (let i = this.sourceFile.statements.length - 1; i >= 0; i--)
		{
			const statement = this.sourceFile.statements[i];
			isExportAssignment(statement) && counter.assignments++;
			isExportDeclaration(statement) && counter.declarations++;
		}

		if(counter.assignments !== 0 || counter.declarations > 1)
		{
			for (let i = this.sourceFile.statements.length - 1; i >= 0; i--)
			{
				const statement = this.sourceFile.statements[i];
				isExportAssignment(statement) && this._cutExportAssignment(statement, i);
				isExportDeclaration(statement) && this._cutExportDeclaration(statement, i);
			}
		}
	}

	private _cutExportAssignment(statement: any, index: number)
	{
		const exportAssignment = statement.getFullText();
		const triviaWidth = statement.getLeadingTriviaWidth();
		const start = statement.getFullStart();
		const width = triviaWidth + statement.getWidth();
		const exportedEntity = exportAssignment.replace("export ", "");

		// save name of exported entity to the this.exportAssignments array
		this.exportAssignments.push(statement.name.getText());

		// Remove existing export assignment
		this.edits.push({ span: { start: start, length: width }, newText: exportedEntity, priority: index });
	}

	// collects all export declaration in this.exportDeclarations array and cut them off
	// from file to have ability to merge and insert to the EOF
	private _cutExportDeclaration(statement: any, index: number)
	{
		const verboseStatementLength = 30;
		const triviaWidth = statement.getLeadingTriviaWidth();
		const start = statement.getFullStart();
		const width = triviaWidth + statement.getWidth();

		if (this.opts.verbose)
			console.log(`Moving "${statement.getText().slice(0, verboseStatementLength)}..." to EOF`);

		// Remove existing export declaration
		this.edits.push({ span: { start: start, length: width }, newText: "", priority: index });

		// Collect the array of entities from export declarations
		this.exportDeclarations = this.exportDeclarations.concat(statement.exportClause.elements);
	}

	// get names of exported entities from this.exportDeclarations array,
	// group them in one export declaration and insert to the EOF
	private _insertUnifiedExportDeclaration(): void
	{
		const fileTextTrimmedRight = this.sourceFile.getFullText().replace(/\s+$/, "");
		const eof = fileTextTrimmedRight.length;

		// exportEntities unites entities from export assignments and export declarations
		let exportedEntities: any = [];

		if(this.exportDeclarations.length)
		{
			let unifiedExport: String = `export {${this.formatOptions.NewLineCharacter}`;

			exportedEntities = this.exportDeclarations.map((item: any) => {
				return item.name.getText();
			});

			exportedEntities = exportedEntities.concat(this.exportAssignments);

			exportedEntities.forEach((item: any, index: any) =>
			{
				const lastItem = (index === exportedEntities.length - 1);
				unifiedExport += this.formatOptions.TabCharacter + item + (lastItem ? this.formatOptions.NewLineCharacter : "," + this.formatOptions.NewLineCharacter);
			});

			unifiedExport += '};';

			this.edits.push({ span: { start: eof, length: 0 }, newText: this.formatOptions.NewLineCharacter + this.formatOptions.NewLineCharacter + unifiedExport, priority: 0 });
		}
	}
}

function isExportDeclaration(node: ts.Node): boolean
{
	return node.kind === ts.SyntaxKind.ExportDeclaration;
}

function isExportAssignment(node: ts.Node): boolean
{
	return node.kind === ts.SyntaxKind.ExportAssignment
		|| Lint.hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword);
}

export { Formatter };
