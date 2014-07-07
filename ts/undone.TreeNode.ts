class TreeNode {

  public parent: TreeNode;
  public children: TreeNode[];

  public addChild(node: TreeNode): TreeNode {
    node.parent = this;
    this.children.push(node);

    return node;
  }

  public addChildren(childNodes: any[]) {
    for (var i = 0; i < childNodes.length; i++) {
      this.addChild(childNodes[i]);
    }
  }

  public removeChild(node: TreeNode): TreeNode {
    var childIndex = this.children.indexOf(node);
    var child = this.children[childIndex];

    if (childIndex > -1) {
      this.children.splice(childIndex, 1)[0].parent = null;
    }

    return child;
  }

  public clearChildren() {
    while (this.children.length > 0) {
      this.removeChild(this.children[0]);
    }
  }
}

export = TreeNode;