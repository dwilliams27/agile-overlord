# App idea

This app will be a simulation of what managing a team of engineers is like in 2025. It will have immitation versions of common applications like slack, jira, and github. All "team members" will be AI agents that simulate an absurdist version of modern devs, posting their own messages both related to and not related to work on the simulated slack environment; they will be assigned tickets in the simulated jira app; and they will try to write actual, functioning code and post it to a github-like system with PR reviews and basic CI/CD. All of this will be built to run entirely locally, with the exception of external queries to AI models for the agents.

## human_docs/
The `human_docs/` root folder is the only part of the repo not constructed by AI. Always make sure that what you are building lines up with the high level goals outlined in this folder.

## ai_docs/
The `ai_docs/` folder will contain documentation constructed by the AI while writing the code that covers essential architecture decisions. This folder MUST be kept up to date

## Tech stack
Core technologies used should be Typescript, React, Tailwind, SQLite, and Express.
