package main

import (
	"errors"
	"testing"
	"time"
)

func TestInstallerOperationDoesNotBlockUI(t *testing.T) {
	release := make(chan struct{})
	started := make(chan struct{})
	woke := make(chan struct{}, 1)
	want := errors.New("download interrupted")
	operation := startInstallerOperation(func() error {
		close(started)
		<-release
		return want
	}, func() { woke <- struct{}{} })
	// Returning an operation while the download is still pending allows the
	// UI to draw its working state and process window events.
	select {
	case <-started:
	case <-time.After(time.Second):
		t.Fatal("worker did not start")
	}
	select {
	case <-operation.result:
		t.Fatal("reported completion before the work finished")
	default:
	}
	close(release)
	select {
	case err := <-operation.result:
		if !errors.Is(err, want) { t.Fatalf("lost original error: %v", err) }
	case <-time.After(time.Second):
		t.Fatal("worker result not delivered")
	}
	select {
	case <-woke:
	case <-time.After(time.Second):
		t.Fatal("UI was not woken after completion")
	}
}

func TestInstallerOperationSuccess(t *testing.T) {
	operation := startInstallerOperation(func() error { return nil }, func() {})
	select {
	case err := <-operation.result:
		if err != nil { t.Fatal(err) }
	case <-time.After(time.Second):
		t.Fatal("success not delivered")
	}
}
