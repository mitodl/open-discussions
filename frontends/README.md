# Yarn Workspaces in Open Discussions

This project uses [yarn workspaces](https://yarnpkg.com/features/workspaces) to help organize frontend code. Yarn workspaces are a tool for managing node packages, in this case *local* node packages.

Each subdirectory of `/frontends` is a yarn workspace:
```
frontends/
├─ open-discussions/         ... built by webpack and served by django
├─ infinite-corridor/        ... built by webpack and served by django
├─ package1/                 ... a (potentially shared) dependency
├─ package2/
├─ etc...  
```
To aid in separating concerns, we should strive to write code with independent, clearly defined contracts that can be extracted to isolated packages (workspaces) and re-used throughout this project.

**Flow vs Typescript:** The majority of the frontend code in this project is in the `open-discussions` workspace and is written in Javascript + FlowType. We are in the process of migrating the codebase to Typescript and all other packages should be written in Typescript.


## Running Yarn Commands
Commands can be run for all workspaces or for a specific workspace. For example:
```bash
# Lint all workspaces
> docker compose run --rm watch yarn run lint-fix
# Run the lint-fix defined in a specific workspace named "my-wrkspace"
> Docker compose run --rm watch yarn workspace my-workspace run lint-fix
```

Most workspaces are shared dependencies built using typescript and tested with jest. Generally, these workspaces do not define their own linting and testing commands, instead using the `global:lint-fix`, etc, commands defined at the project root. For example:
```bash
# Lint the ol-utils workspace
> docker compose run --rm watch yarn workspace ol-utils run globa:lint-fix
```
Again, `globa:lint-fix` is defined at the root workspace, not within `ol-utils`. This works because [yarn commands containing a colon can be run from any workspace](https://yarnpkg.com/getting-started/qa#how-to-share-scripts-between-workspaces). 

## Flow-compatible Typescript via `global:build-flowtypes`
Because we are in the process of converting this codebase to Typescript, shared dependencies like `ol-utils` need to be compiled to regular javascript so that they can be used in the `open-discussions` workspace. Additionally, it is useful to provide FlowType declarations for the converted code. We can do this automatically via the yarn script `global:build-flowtypes`, which compiles FlowType declarations from Typescript declarations. The conversion from TS to Flow is not always perfect, but it is good enough. (For example: function components declared with `React.FC` do not compile property, resulting in `any(implicit)` as the Flowtype definition.)

Additionally, it is not run in watch mode because it is somewhat slow, but does run during builds.