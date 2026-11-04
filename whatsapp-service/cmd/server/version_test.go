package main

import (
	"runtime/debug"
	"testing"
)

func TestDependencyVersionFromBuildInfo(t *testing.T) {
	buildInfo := &debug.BuildInfo{
		Deps: []*debug.Module{
			{Path: "example.com/other", Version: "v1.0.0"},
			{Path: whatsmeowModulePath, Version: "v0.0.0-test"},
		},
	}

	if got := dependencyVersionFromBuildInfo(buildInfo, whatsmeowModulePath); got != "v0.0.0-test" {
		t.Fatalf("dependencyVersionFromBuildInfo() = %q, want %q", got, "v0.0.0-test")
	}
}

func TestDependencyVersionFromBuildInfoUsesReplacement(t *testing.T) {
	buildInfo := &debug.BuildInfo{
		Deps: []*debug.Module{
			{
				Path:    whatsmeowModulePath,
				Version: "v0.0.0-old",
				Replace: &debug.Module{Path: whatsmeowModulePath, Version: "v0.0.0-new"},
			},
		},
	}

	if got := dependencyVersionFromBuildInfo(buildInfo, whatsmeowModulePath); got != "v0.0.0-new" {
		t.Fatalf("dependencyVersionFromBuildInfo() = %q, want replacement version", got)
	}
}
