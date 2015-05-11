#! /bin/bash

git config user.email "interactive@bamideas.com"
git config user.name "BaM Interactive"
cp iisnode.staging.yml iisnode.yml
git remote add azure "https://baminteractive:$STAGING_PASS@manifold-api-staging.scm.azurewebsites.net:443/manifold-api-staging.git" || true
git checkout -b deploy
git add -A
git commit -am "Staging Deployment $(date +%s)"
git push --force azure deploy:master
