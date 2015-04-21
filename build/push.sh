#! /bin/bash

rm -rf .git
git init
git config user.name "BaM Interactive"
git remote add azure "https://baminteractive:$STAGINGPASS@manifold-api-staging.scm.azurewebsites.net:443/manifold-api-staging.git" || true
git checkout -b deploy
git push --force azure deploy:master
