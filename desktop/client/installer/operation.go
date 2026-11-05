package main

// The UI owns the operation and only consumes its result on its own thread.
// Workers must not mutate the selected installation or show popups directly.
type installerOperation struct {
	result chan error
}

func startInstallerOperation(work func() error, wake func()) *installerOperation {
	operation := &installerOperation{result: make(chan error, 1)}
	go func() {
		operation.result <- work()
		wake()
	}()
	return operation
}
