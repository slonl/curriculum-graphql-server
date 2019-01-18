# curriculum-graphql-server
GraphQL server for curriculum data. This server uses the curriculum-doelen and curriculum-inhouden github repositories as submodules.

## installation

### clone the repository

`git clone --recurse-submodules https://github.com/slonl/curriculum-graphql-server`

for older git versions (before 2.13) use:

```
git clone https://github.com/slonl/curriculum-graphql-server
cd curriculum-graphql-server
git submodule update --init --recursive
```

### install nodejs modules

if you haven't installed nodejs yet, then do that first.

```
cd curriculum-graphql-server
npm install
```

### run the server

On unix / linux:

```
cd curriculum-graphql-server
./run.sh
```

The GraphQL server starts at localhost on port 3000 by default.

## updating the dataset

The GraphQL server directly uses these datasets:
- https://github.com/slonl/curriculum-doelen
- https://github.com/slonl/curriculum-inhouden

They are add as a submodule in the `data/` directory. This directory also contains a file called `combined.json`. This file contains all the data from both datasets. To update the datasets to the latest development version:

```
cd data/curriculum-doelen
git pull origin master
cd ../curriculum-inhouden
git pull origin master
cd ../
nodejs ./combine.js
```

And then restart the GraphQL server.
