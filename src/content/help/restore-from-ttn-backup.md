---
title: Restore from ttn-backup
category: Data & backup
order: 20
summary: Pull a snapshot back in from the cross-app ttn-backup utility.
---

ttn-backup is a separate utility that snapshots all your TTN apps into one
bundle on a schedule. If you use it, you can restore this app's data straight
from that bundle without handling a file yourself.

## Before you start

- You need an existing ttn-backup snapshot that includes TTN List.

## Steps

1. Tap **Settings** in the bottom navigation.
2. Under **Backup & restore**, tap **Restore from ttn-backup**.
3. Follow the prompt to pick the snapshot to restore.

## What you'll see

The restore replaces your current data with the snapshot's contents and reloads
the app — the same outcome as a **Replace** import. If you'd rather move data
by hand, use the file-based export and import instead.

## Related guides

- [Back up and restore your data](/help/back-up-and-restore-your-data)
