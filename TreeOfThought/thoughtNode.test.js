// thoughtNode.test.js
import { ThoughtNode } from './TreeOfThought.js';

test('addChild adds a child node', () => {
    const parentNode = new ThoughtNode('parent');
    const childNode = new ThoughtNode('child');
    parentNode.addChild(childNode);
    expect(parentNode.children).toContain(childNode);
});
