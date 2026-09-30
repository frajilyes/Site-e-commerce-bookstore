import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCart, setWishlist } from "../book/bookSlice";
import { selectCart, selectWishlist } from "../book/bookSelectors";
import useAuth from "./useAuth";

const useCartSync = () => {
  const dispatch = useDispatch();
  const { isSignedIn, isOffline } = useAuth();
  const cart = useSelector(selectCart);
  const wishlist = useSelector(selectWishlist);

  const syncedRef = useRef(false);

  const cartRef = useRef(cart);
  const wishlistRef = useRef(wishlist);
  cartRef.current = cart;
  wishlistRef.current = wishlist;

  useEffect(() => {
    if (!isSignedIn || isOffline) {
      syncedRef.current = false;
      return undefined;
    }

    if (syncedRef.current) return undefined;
    syncedRef.current = true;

    let active = true;

    (async () => {
      const [{ default: cartService }, { default: wishlistService }] =
        await Promise.all([
          import("../services/cartService"),
          import("../services/wishlistService"),
        ]);

      try {
        const serverCart = await cartService.mergeCart(cartRef.current);
        if (active) dispatch(setCart(serverCart.items));
      } catch (error) {
      }

      try {
        const serverWishlist = await wishlistService.syncWishlist(
          wishlistRef.current,
        );
        if (active) dispatch(setWishlist(serverWishlist.books));
      } catch (error) {
      }
    })();

    return () => {
      active = false;
    };
  }, [dispatch, isSignedIn, isOffline]);
};

export default useCartSync;
