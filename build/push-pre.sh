#! /bin/bash

git config user.email "interactive@bamideas.com"
git config user.name "BaM Interactive"
cp iisnode.staging.yml iisnode.yml
git remote add azure "https://baminteractive:$STAGING_PASS@manifold-api-pre.scm.azurewebsites.net:443/manifold-api-pre.git" || true
git checkout -b deploy
git add -A
git commit -am "Pre-production Deployment $(date +%s)"
git push --force azure deploy:master
