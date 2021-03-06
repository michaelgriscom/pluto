import { expect } from "chai";
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { IKeybinding } from "../Configuration";
import { StatusBarKeybindingGuide } from "../KeybindingGuide";
import { KeybindingTree } from "../KeybindingTree";
import { KeybindingTreeTraverser } from "../KeybindingTreeTraverser";
import { LeaderMode } from "../LeaderMode";
import { isActiveSetting } from "../strings";

suite("LeaderMode Tests", async function () {
    const typeCommand = "type";

    test("Handles enable/disable shortcut hints", async () => {
        const keybindingTree = sinon.createStubInstance(KeybindingTree);
        const traverser = sinon.createStubInstance(KeybindingTreeTraverser);
        keybindingTree.getTraverser.returns(traverser);

        const keybindingGuide = sinon.createStubInstance(StatusBarKeybindingGuide);
        const leaderMode = new LeaderMode(keybindingTree, keybindingGuide);

        await vscode.commands.executeCommand(typeCommand, "a");

        expect(keybindingGuide.show.notCalled).to.be.true;
        await leaderMode.enable();
        expect(keybindingGuide.show.calledOnce).to.be.true;
        await leaderMode.enable();
        expect(keybindingGuide.show.calledOnce).to.be.true;
        await leaderMode.disable();
        expect(keybindingGuide.hide.calledOnce).to.be.true;
        expect(keybindingGuide.dispose.notCalled).to.be.true;

        leaderMode.dispose();
    });

    test("Registers and deregisters type event", async () => {
        const registerStub = sinon.stub(vscode.commands, "registerCommand");
        const disposableStub = sinon.createStubInstance(vscode.Disposable);
        registerStub.returns(disposableStub);
        const keybindingTree = sinon.createStubInstance(KeybindingTree);
        const traverser = sinon.createStubInstance(KeybindingTreeTraverser);
        keybindingTree.getTraverser.returns(traverser);
        const keybindingGuide = sinon.createStubInstance(StatusBarKeybindingGuide);
        const leaderMode = new LeaderMode(keybindingTree, keybindingGuide);

        expect(registerStub.notCalled).to.be.true;
        await leaderMode.enable();
        expect(registerStub.calledOnce).to.be.true;
        await leaderMode.disable();
        expect(disposableStub.dispose.calledOnce).to.be.true;

        (vscode.commands.registerCommand as any).restore();

        leaderMode.dispose();
    });

    test("Sets isActive", async () => {
        const executeStub = sinon.stub(vscode.commands, "executeCommand");
        const keybindingTree = sinon.createStubInstance(KeybindingTree);
        const traverser = sinon.createStubInstance(KeybindingTreeTraverser);
        keybindingTree.getTraverser.returns(traverser);
        const keybindingGuide = sinon.createStubInstance(StatusBarKeybindingGuide);
        const leaderMode = new LeaderMode(keybindingTree, keybindingGuide);

        await leaderMode.enable();
        expect(executeStub.calledOnce).to.be.true;
        expect(executeStub.getCall(0).args[0]).to.equal('setContext');
        expect(executeStub.getCall(0).args[1]).to.equal(isActiveSetting);
        expect(executeStub.getCall(0).args[2]).to.be.true;

        await leaderMode.disable();
        expect(executeStub.getCall(1).args[0]).to.equal('setContext');
        expect(executeStub.getCall(1).args[1]).to.equal(isActiveSetting);
        expect(executeStub.getCall(1).args[2]).to.be.false;

        (vscode.commands.executeCommand as any).restore();

        leaderMode.dispose();
    });

    test("Cleans up resources", async () => {
        const registerStub = sinon.stub(vscode.commands, "registerCommand");
        const disposableStub = sinon.createStubInstance(vscode.Disposable);
        registerStub.returns(disposableStub);

        const keybindingTree = sinon.createStubInstance(KeybindingTree);
        const traverser = sinon.createStubInstance(KeybindingTreeTraverser);
        keybindingTree.getTraverser.returns(traverser);
        const keybindingGuide = sinon.createStubInstance(StatusBarKeybindingGuide);
        const leaderMode = new LeaderMode(keybindingTree, keybindingGuide);

        await leaderMode.enable();
        await leaderMode.disable();
        expect(keybindingGuide.dispose.notCalled).to.be.true;
        leaderMode.dispose();
        expect(keybindingGuide.dispose.calledOnce).to.be.true;
        expect(disposableStub.dispose.calledOnce).to.be.true;

        (vscode.commands.registerCommand as any).restore();
    });

    test("sends key to traverser", async () => {
        const keybindingTree = sinon.createStubInstance(KeybindingTree);
        const traverser = sinon.createStubInstance(KeybindingTreeTraverser);
        keybindingTree.getTraverser.returns(traverser);
        const keybindingGuide = sinon.createStubInstance(StatusBarKeybindingGuide);
        const leaderMode = new LeaderMode(keybindingTree, keybindingGuide);
        traverser.isTerminal.returns(false);

        await leaderMode.enable();

        const typeArgs = ["a", "b", "c", "d", "e"];
        typeArgs.forEach(async (typeArg, index) => {
            await vscode.commands.executeCommand(typeCommand, { text: typeArg });
            expect(traverser.selectKey.getCall(index).args[0]).to.equal(typeArg);
        });

        leaderMode.dispose();
    });

    test("shows correct options", async () => {
        const keybindingTree = sinon.createStubInstance(KeybindingTree);
        const traverser = sinon.createStubInstance(KeybindingTreeTraverser);
        keybindingTree.getTraverser.returns(traverser);
        const keybindingGuide = sinon.createStubInstance(StatusBarKeybindingGuide);
        const leaderMode = new LeaderMode(keybindingTree, keybindingGuide);
        traverser.isTerminal.returns(false);

        const firstOptions = [{ key: "firstOptions" }];
        traverser.getAllowedKeys.returns(firstOptions);
        await leaderMode.enable();

        expect(keybindingGuide.show.getCall(0).args[0]).to.equal(firstOptions);

        const secondOptions = [{ key: "secondOptions" }];
        traverser.getAllowedKeys.returns(secondOptions);
        await vscode.commands.executeCommand(typeCommand, { text: "a" });

        expect(keybindingGuide.show.getCall(1).args[0]).to.equal(secondOptions);
        expect(keybindingGuide.show.calledTwice).to.be.true;
        leaderMode.dispose();
    });

    test("handles error", async () => {
        const registerStub = sinon.stub(vscode.commands, "registerCommand");
        const disposableStub = sinon.createStubInstance(vscode.Disposable);
        registerStub.returns(disposableStub);

        const keybindingTree = sinon.createStubInstance(KeybindingTree);
        const traverser = sinon.createStubInstance(KeybindingTreeTraverser);
        keybindingTree.getTraverser.returns(traverser);
        const keybindingGuide = sinon.createStubInstance(StatusBarKeybindingGuide);
        const leaderMode = new LeaderMode(keybindingTree, keybindingGuide);
        traverser.isTerminal.returns(false);

        traverser.selectKey.throws("mock error");
        await leaderMode.enable();
        await registerStub.getCall(0).args[1]({ text: "a" });

        expect(disposableStub.dispose.calledOnce).to.be.true;

        (vscode.commands.registerCommand as any).restore();
        leaderMode.dispose();
    });

    test("invokes terminal command with args", async () => {
        const registerStub = sinon.stub(vscode.commands, "registerCommand");
        const disposableStub = sinon.createStubInstance(vscode.Disposable);
        registerStub.returns(disposableStub);

        const keybindingTree = sinon.createStubInstance(KeybindingTree);
        const traverser = sinon.createStubInstance(KeybindingTreeTraverser);
        keybindingTree.getTraverser.returns(traverser);
        const keybindingGuide = sinon.createStubInstance(StatusBarKeybindingGuide);
        const leaderMode = new LeaderMode(keybindingTree, keybindingGuide);
        traverser.isTerminal.returns(true);

        const keybinding: IKeybinding = {
            command: "foo",
            keySequence: ["a"],
            args: [{
                arg1: "val1",
                arg2: "val2"
            }, {
                arg3: "val3"
            }]
        };

        traverser.getTerminalKeybinding.returns(keybinding);

        await leaderMode.enable();
        const executeStub = sinon.stub(vscode.commands, "executeCommand");

        // simulates a key press
        await registerStub.getCall(0).args[1]({ text: "a" });

        expect(executeStub.calledTwice).to.be.true;
        expect(executeStub.getCall(0).args[0]).to.equal(keybinding.command);
        expect(executeStub.getCall(0).args[1]).to.deep.equal(keybinding.args);
        expect(disposableStub.dispose.calledOnce).to.be.true;

        leaderMode.dispose();
        (vscode.commands.registerCommand as any).restore();
        (vscode.commands.executeCommand as any).restore();
    });

    test("invokes terminal command without args", async () => {
        const registerStub = sinon.stub(vscode.commands, "registerCommand");
        const disposableStub = sinon.createStubInstance(vscode.Disposable);
        registerStub.returns(disposableStub);

        const keybindingTree = sinon.createStubInstance(KeybindingTree);
        const traverser = sinon.createStubInstance(KeybindingTreeTraverser);
        keybindingTree.getTraverser.returns(traverser);
        const keybindingGuide = sinon.createStubInstance(StatusBarKeybindingGuide);
        const leaderMode = new LeaderMode(keybindingTree, keybindingGuide);
        traverser.isTerminal.returns(true);

        const keybinding: IKeybinding = {
            command: "foo",
            keySequence: ["a"]
        };

        traverser.getTerminalKeybinding.returns(keybinding);

        await leaderMode.enable();
        const executeStub = sinon.stub(vscode.commands, "executeCommand");

        // simulates a key press
        await registerStub.getCall(0).args[1]({ text: "a" });

        expect(executeStub.calledTwice).to.be.true;
        expect(executeStub.getCall(0).args[0]).to.equal(keybinding.command);
        expect(executeStub.getCall(0).args[1]).to.be.empty;
        expect(disposableStub.dispose.calledOnce).to.be.true;

        leaderMode.dispose();
        (vscode.commands.registerCommand as any).restore();
        (vscode.commands.executeCommand as any).restore();
    });
});