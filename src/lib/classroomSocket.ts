import { requestClassroomTicket } from "./playerApi";

/** Keep the JWT HttpOnly: authenticate a new socket with a one-use, 30-second ticket. */
export async function sendClassroomMessage(socket: WebSocket, message: object): Promise<void> {
  const type = (message as { type?: string }).type;
  let payload = message;
  if (type === "join_room" || type === "create_room") {
    const { ticket } = await requestClassroomTicket();
    if (!ticket) throw new Error("Unable to authorize the classroom connection. Please log in again.");
    payload = { ...message, ticket };
  }
  // Navigation/reconnect may have replaced the socket while the API request was pending.
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}
