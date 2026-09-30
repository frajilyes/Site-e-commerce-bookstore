import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import store from "./app/store";

const renderApp = (route = "/") =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </Provider>,
  );

test("renders the store landing page", async () => {
  renderApp("/");
  expect(
    await screen.findByRole("heading", { name: /welcome to bookstore/i }),
  ).toBeInTheDocument();
});

test("renders the navbar brand", () => {
  renderApp("/");
  expect(screen.getByText(/read & discover/i)).toBeInTheDocument();
});
