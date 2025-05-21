export interface WebviewMessage {
	type:
		| "serverRequest"
		| "serverResponse"
}

export interface WebviewServerRequest<T> extends WebviewMessage {
	type:
		| "serverRequest"

	serverRequest: T
	serverRequestId: string
	serverEndpoint: string
}

export interface WebviewServerResponse<T> extends WebviewMessage {
	type:
		| "serverResponse"

	serverRequestId: string
	serverResponse: T
}