#! /bin/bash

git remote add azure "https://baminteractive:$STAGING_PASS@manifold-api-staging.scm.azurewebsites.net:443/manifold-api-staging.git" || true
git checkout -b deploy
git push --force azure deploy:master
