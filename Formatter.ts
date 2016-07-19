import * as ts from "typescript";
import { Options, Context } from "./Processor";
import * as fl from "./FormatterLoader";
import { createDefaultFormatCodeOptions, FormatCodeOptions } from "./FormatCodeOptions";

function checkForIntersectingEdits(edits: TextChange[])
{
	edits = sortEdits(edits);
	for (let i = 1; i < edits.length; i++)
	{
		const currentSpan = edits[i].span;
		const previousSpan = edits[i - 1].span;
		if (currentSpan.start < previousSpan.start + previousSpan.length)
			throw new Error("There must be no intersections between edit spans");	
	}
}

function fixupParentReferences(sourceFile: ts.SourceFile) 
{
	let parent: ts.Node = sourceFile;

	function walk(n: ts.Node): void
	{
		n.parent = parent;

		let saveParent = parent;
		parent = n;
		ts.forEachChild(n, walk);
		parent = saveParent;
	}

	ts.forEachChild(sourceFile, walk);
}

function sortEdits(edits: TextChange[]): TextChange[]
{
	return edits.sort((a, b) => 
		a.span.start > b.span.start ? 1	: (a.span.start < b.span.start ? -1 
			: (a.priority > b.priority ? 1 : (a.priority < b.priority ? -1 : 0))));
}

function applyEdits(text: string, edits: TextChange[]): string 
{ 
	edits = sortEdits(edits);
	// Apply edits in reverse on the existing text
	const resultArray: string[] = [];
	let previousSpanStart: number = text.length;
	for (let i = edits.length - 1; i >= 0; i--)
	{
		const edit = edits[i];
		if (typeof edit.span.start !== "number")
			throw new Error("change.span.start is not a number");
			
		const tail = text.slice(edit.span.start + edit.span.length, previousSpanStart);
		resultArray.unshift(tail);
		resultArray.unshift(edit.newText);
		if (i !== 0)
			previousSpanStart = edit.span.start;
		else
		{
			const head = text.slice(0, edit.span.start);
			resultArray.unshift(head);
		}
	}
	return resultArray.join('');
}

interface Formatter
{
	name: string;
	isApplicable(formatOptions: FormatCodeOptions): boolean;
	format(sourceFile: ts.SourceFile, opts: Options, formatOptions: FormatCodeOptions): TextChange[];
}

function getLeadingWhitespace(node: ts.Node): string
{	
	let result: string;
	
	const fullText = node.getFullText();
	const startPos = node.getStart();
	const fullStartPos = node.getFullStart();
	for (let i = startPos - fullStartPos; i >= 0; i--)
	{
		if (!/\s/.test(fullText[i]))
		{
			result = fullText.slice(i, startPos - fullStartPos);
			break;
		}
	}
	
	return result;
}

function getLineIndentation(node: ts.Node): string
{ 
	let result: string;
	const sourceFile = node.getSourceFile();
	const sourceFileText = sourceFile.getFullText();
	const startPos = node.getStart();
	
	const lineStartPos = (ts as any).getLineStartPositionForPosition(startPos, sourceFile);
	
	// Now we need to find the first non-whitespace index in the line.
	const nodeFullEndPos = startPos + node.getWidth();
	for (let i = lineStartPos; i < nodeFullEndPos; i++)
	{
		if (!/\s/.test(sourceFileText[i]))
		{
			result = sourceFileText.slice(lineStartPos, i);
			break;
		}
	}
	
	return result;
} 

function formatString(
	fileName: string, text: string,
	context: Context,
	formatOptions: FormatCodeOptions = createDefaultFormatCodeOptions()): string
{
	const formatters: Formatter[] = context.formatters ? context.formatters : context.formatters = fl.loadFormatters(context.opts);

	for (let formatter of formatters)
	{
		try
		{
			if (formatter.isApplicable(formatOptions))
			{
				if (context.opts.verbose)
					console.log(`Running formatter "${formatter.name}" against "${fileName}"`);
				const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest);
				fixupParentReferences(sourceFile);
				const edits = formatter.format(sourceFile, context.opts, formatOptions);
				if (edits.length !== 0)
				{
					checkForIntersectingEdits(edits);
					text = applyEdits(text, edits);
					if (context.opts.verbose)
						console.log(`  Applied ${edits.length} changes`);
				}
				else if (context.opts.verbose)
					console.log(`  No formatter changes detected`);
			}
		}
		catch (ex)
		{
			throw new Error(`Error while processing ${formatter.name}: ${ex}`);
		}
	}
	return text;
}

class TextChange extends ts.TextChange
{
	priority: number;
}

export { Formatter, getLeadingWhitespace, getLineIndentation, formatString, TextChange };
