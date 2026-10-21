import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage";

describe("employee LoginPage", () => {
  const onBack = vi.fn();
  const onLogin = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    onLogin.mockReset();
    onBack.mockReset();
    sessionStorage.clear();
  });

  it("keeps the four agreed employee roles and removes customer self-service", () => {
    render(<LoginPage onLogin={onLogin} onBack={onBack} />);

    for (const role of ["Lễ tân", "Buồng phòng", "Kế toán", "Quản lý"]) {
      expect(screen.getByRole("button", { name: role })).toBeTruthy();
    }
    expect(screen.queryByRole("button", { name: /khách hàng|đăng ký|quên mật khẩu/i })).toBeNull();
  });

  it("requires both employee ID and password", () => {
    render(<LoginPage onLogin={onLogin} onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: /đăng nhập/i }));

    expect(screen.getByText("Vui lòng nhập đầy đủ thông tin đăng nhập.")).toBeTruthy();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("rejects a customer phone number before calling employee authentication", () => {
    render(<LoginPage onLogin={onLogin} onBack={onBack} />);

    fireEvent.change(screen.getByPlaceholderText("Nhập mã nhân viên"), { target: { value: "0901234567" } });
    fireEvent.change(screen.getByPlaceholderText("Nhập mật khẩu của bạn"), { target: { value: "hotel123" } });
    fireEvent.click(screen.getByRole("button", { name: /đăng nhập/i }));

    expect(screen.getByText("Chỉ nhân viên khách sạn mới đăng nhập tại đây.")).toBeTruthy();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("logs in with the selected employee ID and shows backend errors", async () => {
    onLogin.mockResolvedValue("Sai tài khoản hoặc mật khẩu");
    render(<LoginPage onLogin={onLogin} onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: "Lễ tân" }));
    fireEvent.click(screen.getByRole("button", { name: /đăng nhập/i }));

    expect(onLogin).toHaveBeenCalledWith("FRONTDESK", "hotel123");
    expect(await screen.findByText("Sai tài khoản hoặc mật khẩu")).toBeTruthy();
  });
});
