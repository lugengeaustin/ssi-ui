import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field, Input } from "../src/Field";

describe("Field", () => {
  it("associates the label with the control via htmlFor/id", () => {
    render(
      <Field label="Email">
        {(controlProps) => <Input {...controlProps} placeholder="you@ex.com" />}
      </Field>,
    );
    // getByLabelText resolves the label -> control association.
    const input = screen.getByLabelText("Email");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "you@ex.com");
  });

  it("uses an explicit htmlFor id when provided", () => {
    render(
      <Field label="Name" htmlFor="the-name">
        {(controlProps) => <Input {...controlProps} />}
      </Field>,
    );
    expect(screen.getByLabelText("Name")).toHaveAttribute("id", "the-name");
  });

  it("renders error text and wires aria-invalid + aria-describedby to it", () => {
    render(
      <Field label="Email" htmlFor="em" error="Required field">
        {(controlProps) => <Input {...controlProps} />}
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    const err = screen.getByText("Required field");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(err).toHaveAttribute("id", "em-err");
    expect(input).toHaveAttribute("aria-describedby", "em-err");
  });

  it("renders hint text and describes the control by it when no error", () => {
    render(
      <Field label="Email" htmlFor="em2" hint="We never share it">
        {(controlProps) => <Input {...controlProps} />}
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    expect(screen.getByText("We never share it")).toHaveAttribute("id", "em2-hint");
    expect(input).toHaveAttribute("aria-describedby", "em2-hint");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("marks a required field with an asterisk", () => {
    render(
      <Field label="Email" required htmlFor="em3">
        {(controlProps) => <Input {...controlProps} />}
      </Field>,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });
});
