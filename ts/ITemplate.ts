interface ITemplate<T> {
  name: string;
  onRenderHtml(dataContext: T): string;
}
