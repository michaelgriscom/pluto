import { IKeyNode } from "./keyTree";
import { IKeyBinding } from "./configuration";

export interface ITreeTraverser {
    isTerminal(): boolean;
    getCommand(): string;
    getCurrentOptions(): ReadonlyArray<{ key: string, keyBinding?: IKeyBinding }>;
    chooseOption(key: string): void;
}

export class TreeTraverser implements ITreeTraverser {
    private _currentNode: IKeyNode;

    public constructor(rootNode: IKeyNode) {
        this._currentNode = rootNode;
    }

    public isTerminal(): boolean {
        return this._currentNode.keyBinding !== undefined
            && this._currentNode.keyBinding.command !== undefined;
    }

    public getCommand(): string {
        if(!this.isTerminal()) {
            throw new Error("No command for given sequence.");
        }

        return this._currentNode.keyBinding!.command!;
    }

    public getCurrentOptions(): ReadonlyArray<{key: string, keyBinding?: IKeyBinding}> {
        return this._currentNode.children;
    }

    public chooseOption(key: string) {
        const newNode = this._currentNode.children.filter((node) => node.key === key);
        if(newNode.length === 0) {
            throw new Error("Invalid key");
        }

        this._currentNode = newNode[0];
    }
}