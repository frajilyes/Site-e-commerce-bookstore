import { useEffect, useState } from "react";
import { getBooks } from "../services/bookService";

const useBooks = () => {
  const [books, setBooks] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    getBooks()
      .then((data) => {
        if (!active) return;
        setBooks(data);
        setStatus("success");
      })
      .catch((err) => {
        if (!active || err?.code === "cancelled") return;
        setError(err);
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  return { books, status, error, isLoading: status === "loading" };
};

export default useBooks;
