#!/usr/bin/env bash

mkdir -p models_trained

if [ ! -f models_trained/lid.176.bin ]; then
    wget https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.bin \
         -O models_trained/lid.176.bin
fi

pip install -r requirements-render.txt