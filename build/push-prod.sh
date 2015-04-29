#! /bin/bash

git remote add azure "https://baminteractive:$STAGING_PASS@manifold-api-prod.scm.azurewebsites.net:443/manifold-api-prod.git" || true
git checkout -b deploy
git push --force azure deploy:master
