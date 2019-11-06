# curriculum-doelgroepteksten: SLO Curriculum specific texts set

This repository contains additional texts for the curriculum dataset. This dataset contains 'translations' of texts to align them with the target group that would read the texts.
The dataset is defined by the `context.json` JSON Schema file. 

## installation

```
git clone https://github.com/slonl/curriculum-doelgroepteksten.git
cd curriculum-doelgroepteksten
git submodule init
git submodule update
npm install
```

You can validate the dataset by running the test command:

```
npm test
```

## contents

This dataset contains the following collections:

- leerling: Texts aimed at students/pupils.

## validating the data

Running the test script validates the dataset:

```
npm test
```

This uses the `context.json` JSON schema for validation. The JSON schema has two custom extensions:

- `#file` contains the path to retrieve and export each collection from and to
- `itemTypeReference` specifies what type each uuid identifier should map to

