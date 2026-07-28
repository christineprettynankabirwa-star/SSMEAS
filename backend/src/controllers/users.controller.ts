import type { Request, Response } from "express";
import { AuthValidationError, changeUserRole, createUser, listUsers, removeUser, updateUser } from "../services/auth.service";

const handle = (error: unknown, response: Response): void => {
  if (error instanceof AuthValidationError) { response.status(400).json({ message: error.message }); return; }
  console.error("User management failed:", error);
  response.status(500).json({ message: "Unable to manage users." });
};

export const getUsers = async (_request: Request, response: Response): Promise<void> => {
  try { response.json(await listUsers()); } catch (error) { handle(error, response); }
};
export const postUser = async (request: Request, response: Response): Promise<void> => {
  try { response.status(201).json(await createUser(request.body)); } catch (error) { handle(error, response); }
};
export const patchUserRole = async (request: Request, response: Response): Promise<void> => {
  try { response.json(await changeUserRole(String(request.params.id), request.body?.role)); }
  catch (error) { handle(error, response); }
};
export const patchUser = async (request: Request, response: Response): Promise<void> => {
  try { response.json(await updateUser(String(request.params.id), request.body)); }
  catch (error) { handle(error, response); }
};
export const deleteUser = async (request: Request, response: Response): Promise<void> => {
  try { await removeUser(String(request.params.id), request.user!.id); response.status(204).end(); }
  catch (error) { handle(error, response); }
};
