require('@babel/register')({
  /**
   * We use @babel/register to compile test code for mocha when it is imported.
   *
   * By default, @babel/register only transpiles code in the working directory.
   * That's a problem when running tests for open-discussions, since it requires
   * code in other yarn workspaces that needs to be transpiled.
   *
   * There's not clear way to configure this option. But specifying either the
   * `ignore` or the `only` optin disables it.
   *
   * See https://github.com/babel/babel/issues/8321#issuecomment-435389870
   */
  only: ["../"]
})
