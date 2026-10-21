import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ServiceImage } from "./ServiceImage";
import { serviceImagePlaceholder, serviceImageSource } from "../serviceImages";

it("shows a bundled minibar photo when the catalog photo is missing and recovers from failed images", () => {
  const photo = serviceImageSource("OPSWATER", null);
  const { rerender } = render(<ServiceImage src={photo} alt="Nước khoáng minibar" />);
  const image = screen.getByRole("img", { name: "Nước khoáng minibar" });
  expect(image.getAttribute("src")).toBe(photo);
  expect(photo).not.toBe(serviceImagePlaceholder);

  fireEvent.error(image);
  expect(image.getAttribute("src")).toBe(serviceImagePlaceholder);

  rerender(<ServiceImage src="/updated-water.jpg" alt="Nước khoáng minibar" />);
  expect(image.getAttribute("src")).toBe("/updated-water.jpg");

  rerender(<ServiceImage src=" " alt="Nước khoáng minibar" />);
  expect(image.getAttribute("src")).toBe(serviceImagePlaceholder);
});
