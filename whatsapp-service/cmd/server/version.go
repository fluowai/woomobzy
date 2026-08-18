package main

import "runtime/debug"

const whatsmeowModulePath = "go.mau.fi/whatsmeow"

func dependencyVersion(modulePath string) string {
	buildInfo, ok := debug.ReadBuildInfo()
	if !ok {
		return "unknown"
	}
	return dependencyVersionFromBuildInfo(buildInfo, modulePath)
}

func dependencyVersionFromBuildInfo(buildInfo *debug.BuildInfo, modulePath string) string {
	for _, dependency := range buildInfo.Deps {
		if dependency.Path != modulePath {
			continue
		}
		if dependency.Replace != nil {
			dependency = dependency.Replace
		}
		if dependency.Version == "" {
			return "unknown"
		}
		return dependency.Version
	}
	return "unknown"
}
